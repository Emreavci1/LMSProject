export interface Announcement {
  id: number;
  title: string;
  content: string;
  courseId: number | null;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  publishDate: string;
  expiryDate: string | null;
  createdDate: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isGlobal: boolean;
}

export interface CreateAnnouncement {
  title: string;
  content: string;
  courseId: number | null;
  publishDate: string | null;
  expiryDate?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface UpdateAnnouncement {
  title: string;
  content: string;
  publishDate: string | null;
  expiryDate?: string | null;
  isActive: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}
