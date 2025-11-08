export interface Project {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
}

export interface Page {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  versions: Version[];
}

export interface Version {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  assignee?: string;
  linkedPage?: string;
  order: number;
}

export interface Board {
  id: string;
  projectId: string;
  columns: Column[];
  cards: Card[];
}

export interface Activity {
  id: string;
  projectId: string;
  type: "edit" | "comment" | "move" | "create" | "mention";
  actor: string;
  target: string;
  description: string;
  timestamp: Date;
}

export interface Collaborator {
  id: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  cursorPosition: number;
  isEditing: boolean;
  color: string;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}
