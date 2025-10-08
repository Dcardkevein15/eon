// A custom error class for Firestore permission errors.
// This allows us to capture more context about what failed.

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  private readonly context: SecurityRuleContext;
  
  constructor(context: SecurityRuleContext) {
    super();
    this.name = 'FirestorePermissionError';
    this.context = context;
    // A little hack to make the error message more readable in the Next.js overlay.
    this.message = `
FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
${JSON.stringify({ ...this.context, requestResourceData: this.context.requestResourceData ?? ' (not provided for this operation)' }, null, 2)}
`;
  }

  // Override toString() to provide a clean, readable output in the error overlay.
  public toString(): string {
    return this.message;
  }
}
