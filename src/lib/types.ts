import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export type User = FirebaseUser;

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type Chat = {
  id:string;
  title: string;
  messages: Message[];
  createdAt: Timestamp | number;
  userId: string;
  path: string;
};

export type PromptSuggestion = {
  text: string;
  category: string;
}
