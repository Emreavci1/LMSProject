// Sınav (Exam) DTO karşılıkları — backend LMS.DTO.Exams ile birebir

export type QuestionType = 'MultipleChoice' | 'OpenEnded';

// GET /api/courses/{courseId}/exams — liste özeti (ExamListItemDto)
export interface ExamListItem {
  id: number;
  courseId: number;
  title: string;
  description?: string | null;
  timeLimitMin?: number | null;
  maxAttempts: number;
  order: number;
  questionCount: number;
}

// GET .../exams/{examId} — tam sınav (ExamDto)
export interface QuestionOption {
  id: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  order: number;
  options: QuestionOption[];
}

export interface Exam {
  id: number;
  courseId: number;
  title: string;
  description?: string | null;
  timeLimitMin?: number | null;
  maxAttempts: number;
  order: number;
  questions: Question[];
}

// POST/PUT gövdesi (SaveExamDto) — sınav bütün olarak kaydedilir (iç içe)
export interface SaveQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface SaveQuestion {
  type: QuestionType;
  text: string;
  // Yalnızca MultipleChoice'ta doldurulur
  options: SaveQuestionOption[];
}

export interface SaveExam {
  title: string;
  description?: string | null;
  timeLimitMin?: number | null;
  maxAttempts: number;
  questions: SaveQuestion[];
}

// ===== Öğrenci sınava girme (Faz 3) — backend LMS.DTO.Exams student DTO'ları =====

// Öğrenciye dönen şık/soru — doğru cevap bilgisi YOK
export interface StudentOption {
  id: number;
  text: string;
  order: number;
}
export interface StudentQuestion {
  id: number;
  type: QuestionType;
  text: string;
  order: number;
  options: StudentOption[];
}

// Bir soruya verilen cevap (kaydet/gönder ve gösterme için ortak)
export interface StudentAnswer {
  questionId: number;
  selectedOptionId?: number | null;
  textAnswer?: string | null;
}

// Devam eden deneme (resume) — kayıtlı cevaplar + kalan süre
export interface StudentAttempt {
  id: number;
  startedDate: string;
  deadline?: string | null;       // süreli sınavda bitiş anı (UTC)
  remainingSeconds?: number | null; // süreli sınavda kalan saniye
  answers: StudentAnswer[];
}

// Gönderilmiş denemenin sonucu
export interface StudentResult {
  attemptId: number;
  status: 'Submitted' | 'Evaluated';
  submittedDate?: string | null;
  score?: number | null;   // açık uçlu varsa değerlendirme bitene kadar null
  pending: boolean;        // puan henüz kesinleşmedi (açık uçlu bekliyor)
  passed?: boolean | null; // geçti/kaldı (Faz 4)
}

// GET /api/exams/{examId}/my — sınav sayfası tam durumu
export interface StudentExam {
  id: number;
  courseId: number;
  title: string;
  description?: string | null;
  timeLimitMin?: number | null;
  maxAttempts: number;
  questions: StudentQuestion[];
  // kilit
  isUnlocked: boolean;
  lockReason?: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  // deneme
  attemptsUsed: number;
  canStartNew: boolean;
  activeAttempt?: StudentAttempt | null;
  lastResult?: StudentResult | null;
}

// PUT/POST submit gövdesi
export interface SaveAnswers {
  answers: StudentAnswer[];
}

// ===== Değerlendirme (Faz 4) — eğitmen/admin =====

// Değerlendirme listesi satırı (bir öğrencinin son denemesi)
export interface ExamAttemptListItem {
  attemptId: number;
  userId: number;
  studentName: string;
  studentEmail: string;
  submittedDate?: string | null;
  status: 'Submitted' | 'Evaluated';
  score?: number | null;
  passed?: boolean | null;
  needsEvaluation: boolean;
}

export interface EvalOption {
  id: number;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface EvalAnswer {
  questionId: number;
  type: QuestionType;
  questionText: string;
  order: number;
  options: EvalOption[];
  selectedOptionId?: number | null;
  textAnswer?: string | null;
  creditPercent?: number | null;
}

export interface ExamAttemptDetail {
  attemptId: number;
  userId: number;
  studentName: string;
  studentEmail: string;
  submittedDate?: string | null;
  status: 'Submitted' | 'Evaluated';
  score?: number | null;
  passed?: boolean | null;
  hasOpenEnded: boolean;
  answers: EvalAnswer[];
}

// Değerlendirme gönderimi
export interface EvaluateAttempt {
  credits: { questionId: number; creditPercent: number }[];
  passed: boolean;
}
