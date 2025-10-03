import type { User as FirebaseUser } from 'firebase/auth';

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
  createdAt: number;
  userId: string;
  path: string;
};
