import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import {
  EvaluateAttempt,
  Exam,
  ExamAttemptDetail,
  ExamAttemptListItem,
  ExamListItem,
  SaveAnswers,
  SaveExam,
  StudentAttempt,
  StudentExam,
  StudentResult,
} from '../models/exam.models';

// Sınavlar bir kursa bağlıdır: /api/courses/{courseId}/exams
@Injectable({ providedIn: 'root' })
export class ExamService {
  private http = inject(HttpClient);

  private base(courseId: number): string {
    return `${API_URL}/courses/${courseId}/exams`;
  }

  // Bir kursun sınav listesi (özet; doğru cevap içermez) — giriş yapan herkes
  getByCourse(courseId: number): Observable<ExamListItem[]> {
    return this.http.get<ExamListItem[]>(this.base(courseId));
  }

  // Tek sınav, soruları + doğru şıklarıyla — yalnızca sahibi Instructor/Admin
  getById(courseId: number, examId: number): Observable<Exam> {
    return this.http.get<Exam>(`${this.base(courseId)}/${examId}`);
  }

  // Sınav oluştur (yalnızca kursun sahibi Instructor veya Admin)
  create(courseId: number, dto: SaveExam): Observable<Exam> {
    return this.http.post<Exam>(this.base(courseId), dto);
  }

  // Sınav güncelle — tümü yeniden yazılır (yalnızca sahibi Instructor veya Admin)
  update(courseId: number, examId: number, dto: SaveExam): Observable<Exam> {
    return this.http.put<Exam>(`${this.base(courseId)}/${examId}`, dto);
  }

  // Sınav sil (yalnızca sahibi Instructor veya Admin)
  remove(courseId: number, examId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(courseId)}/${examId}`);
  }

  // ===== Öğrenci sınava girme (Faz 3) — /api/exams/{examId}/... =====
  private attemptBase(examId: number): string {
    return `${API_URL}/exams/${examId}`;
  }

  // Sınav sayfası durumu (sorular cevapsız + kilit + devam eden deneme + son sonuç)
  getStudentExam(examId: number): Observable<StudentExam> {
    return this.http.get<StudentExam>(`${this.attemptBase(examId)}/my`);
  }

  // Deneme başlat (devam eden varsa onu döner)
  startAttempt(examId: number): Observable<StudentAttempt> {
    return this.http.post<StudentAttempt>(`${this.attemptBase(examId)}/attempts`, {});
  }

  // Cevapları taslak olarak kaydet
  saveAnswers(examId: number, attemptId: number, dto: SaveAnswers): Observable<StudentAttempt> {
    return this.http.put<StudentAttempt>(`${this.attemptBase(examId)}/attempts/${attemptId}`, dto);
  }

  // Denemeyi gönder (otomatik puanlama)
  submitAttempt(examId: number, attemptId: number, dto: SaveAnswers): Observable<StudentResult> {
    return this.http.post<StudentResult>(
      `${this.attemptBase(examId)}/attempts/${attemptId}/submit`,
      dto
    );
  }

  // ===== Değerlendirme (Faz 4) — /api/courses/{courseId}/exams/{examId}/attempts =====
  private evalBase(courseId: number, examId: number): string {
    return `${this.base(courseId)}/${examId}/attempts`;
  }

  // Sınava girmiş öğrencilerin (son) denemeleri
  getAttempts(courseId: number, examId: number): Observable<ExamAttemptListItem[]> {
    return this.http.get<ExamAttemptListItem[]>(this.evalBase(courseId, examId));
  }

  // Tek denemenin ayrıntısı (puanlama ekranı)
  getAttemptDetail(courseId: number, examId: number, attemptId: number): Observable<ExamAttemptDetail> {
    return this.http.get<ExamAttemptDetail>(`${this.evalBase(courseId, examId)}/${attemptId}`);
  }

  // Değerlendir: açık uçlu kredileri + geçti/kaldı
  evaluate(courseId: number, examId: number, attemptId: number, dto: EvaluateAttempt): Observable<ExamAttemptDetail> {
    return this.http.post<ExamAttemptDetail>(`${this.evalBase(courseId, examId)}/${attemptId}/evaluate`, dto);
  }
}
