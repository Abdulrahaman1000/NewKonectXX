export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;       // for sorting in admin
  isPublished: boolean;
}
