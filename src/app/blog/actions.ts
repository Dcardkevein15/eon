
'use server';

import { doc, setDoc, serverTimestamp, updateDoc, increment, collection, getDocs, runTransaction } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { GenerateArticleTitlesInput, GenerateArticleTitlesOutput, GenerateArticleContentInput, GenerateArticleContentOutput, Article, SuggestedArticleTitle } from '@/lib/types';
import { generateArticleTitles as genTitlesFlow, dispatchArticleWriter } from '@/ai/flows/blog-flows';
import { getRecommendedCategory as getRecommendedCategoryFlow } from '@/ai/flows/get-recommended-category';


// --- Blog Actions ---
export async function generateArticleTitles(input: GenerateArticleTitlesInput): Promise<GenerateArticleTitlesOutput> {
  try {
    return await genTitlesFlow({ category: input.category });
  } catch (error) {
    console.error("Error in generateArticleTitles:", error);
    throw new Error('No se pudieron generar nuevos títulos.');
  }
}


export async function generateAndSaveArticle(userId: string, input: GenerateArticleContentInput): Promise<Article> {
  return await runTransaction(firestore, async (transaction) => {
    const userRef = doc(firestore, 'users', userId);
    const articleRef = doc(firestore, 'articles', input.slug);

    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) {
      throw new Error("User not found.");
    }

    const credits = userDoc.data().articleGenerationCredits || 0;
    if (credits <= 0) {
      throw new Error("No tienes créditos suficientes para generar un artículo.");
    }
    
    // Generate content - this is an external call, so it's the most critical part of the transaction.
    const result = await dispatchArticleWriter(input);
    if (!result.content || !result.authorRole) {
        throw new Error("La IA no pudo generar el artículo completo. Por favor, inténtelo de nuevo.");
    }
    
    // If content generation is successful, proceed with writes.
    const newArticleData: Omit<Article, 'id' | 'createdAt'> = {
        title: input.title,
        slug: input.slug,
        category: input.category,
        content: result.content,
        authorRole: result.authorRole,
        avgRating: 0,
        ratingCount: 0,
    };
    
    transaction.set(articleRef, { ...newArticleData, createdAt: serverTimestamp() });
    transaction.update(userRef, { articleGenerationCredits: increment(-1) });

    return { ...newArticleData, id: articleRef.id, createdAt: new Timestamp(Date.now() / 1000, 0) }; // Return the article data
  });
}


export async function getRecommendedCategory(userProfile: string) {
  return getRecommendedCategoryFlow({ userProfile });
}

export async function searchArticles(searchTerm: string): Promise<(Article | SuggestedArticleTitle)[]> {
    if (!searchTerm.trim()) return [];
    // This is a simplified client-side search for demonstration.
    // For a real app, this should be a server-side search using a service like Algolia or a more complex Firestore query.
    const articlesRef = collection(firestore, 'articles');
    const titlesRef = collection(firestore, 'suggestedArticleTitles');
    
    const [articlesSnap, titlesSnap] = await Promise.all([getDocs(articlesRef), getDocs(titlesRef)]);
    
    const allArticles = articlesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Article));
    const allTitles = titlesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as SuggestedArticleTitle));
    
    const lowercasedTerm = searchTerm.toLowerCase();
    
    const articleResults = allArticles.filter(a => a.title.toLowerCase().includes(lowercasedTerm) || a.content.toLowerCase().includes(lowercasedTerm));
    const titleResults = allTitles.filter(t => t.title.toLowerCase().includes(lowercasedTerm));

    return [...articleResults, ...titleResults];
}

export async function rateArticle(articleId: string, userId: string, rating: number): Promise<{success: boolean, newAvgRating: number, newRatingCount: number}> {
    const articleRef = doc(firestore, 'articles', articleId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const articleDoc = await transaction.get(articleRef);
            if (!articleDoc.exists()) throw new Error("Artículo no encontrado.");

            const data = articleDoc.data() as Article;
            const oldRatingTotal = (data.avgRating || 0) * (data.ratingCount || 0);
            
            const userRatingRef = doc(firestore, `articles/${articleId}/ratings`, userId);
            const userRatingDoc = await transaction.get(userRatingRef);

            let newRatingCount = data.ratingCount || 0;
            let newRatingTotal = oldRatingTotal;

            if (userRatingDoc.exists()) {
                // User is updating their rating
                const oldUserRating = userRatingDoc.data().rating;
                newRatingTotal = oldRatingTotal - oldUserRating + rating;
            } else {
                // User is rating for the first time
                newRatingCount += 1;
                newRatingTotal = oldRatingTotal + rating;
            }
            
            const newAvgRating = newRatingTotal / newRatingCount;

            transaction.update(articleRef, {
                avgRating: newAvgRating,
                ratingCount: newRatingCount,
            });

            transaction.set(userRatingRef, { rating, userId });
        });

        const updatedDoc = await getDoc(articleRef);
        const updatedData = updatedDoc.data() as Article;
        return { success: true, newAvgRating: updatedData.avgRating || 0, newRatingCount: updatedData.ratingCount || 0 };

    } catch (e) {
        console.error("Transaction failure:", e);
        return { success: false, newAvgRating: 0, newRatingCount: 0 };
    }
}

export async function generateArticleContent(input: GenerateArticleContentInput): Promise<GenerateArticleContentOutput> {
  // This is a dummy function now, the real logic is in dispatchArticleWriter
  // It's kept for compatibility if any other part of the app calls it, but it should be deprecated.
  return await dispatchArticleWriter(input);
}
