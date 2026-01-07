// Types for productivity scoring

export interface ProductivityScore {
  id: number;
  userId: string;
  date: string;
  score: number;
  recommendations: string[];
  createdAt: string;
}

export interface CreateProductivityScoreInput {
  userId: string;
  date: string;
  score: number;
  recommendations: string[];
}
