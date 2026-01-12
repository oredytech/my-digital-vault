import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: string[];
}

interface SurveyResponse {
  id: string;
  answers: Record<string, any>;
  created_at: string;
}

interface SurveyPDFExportProps {
  surveyTitle: string;
  surveyDescription?: string;
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
}

export function SurveyPDFExport({ 
  surveyTitle, 
  surveyDescription, 
  questions, 
  responses 
}: SurveyPDFExportProps) {
  const [exporting, setExporting] = useState(false);

  const generatePDFContent = () => {
    const stats = calculateStatistics();
    
    // Create HTML content for PDF
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport - ${surveyTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      padding: 40px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    .header h1 {
      color: #6366f1;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      color: #6b7280;
      font-size: 14px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .meta-item {
      text-align: center;
    }
    .meta-item .value {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
    }
    .meta-item .label {
      font-size: 12px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      color: #374151;
      border-left: 4px solid #6366f1;
      padding-left: 15px;
      margin-bottom: 20px;
    }
    .question-card {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .question-text {
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
    }
    .stat-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    .stat-label {
      flex: 1;
      color: #4b5563;
    }
    .stat-bar {
      width: 200px;
      height: 20px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-right: 10px;
    }
    .stat-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 4px;
    }
    .stat-value {
      font-weight: 600;
      color: #6366f1;
      width: 50px;
      text-align: right;
    }
    .text-responses {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 10px;
      margin-top: 10px;
      font-size: 13px;
      color: #4b5563;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${surveyTitle}</h1>
    ${surveyDescription ? `<p>${surveyDescription}</p>` : ''}
    <p style="margin-top: 10px;">Rapport généré le ${new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="value">${responses.length}</div>
      <div class="label">Réponses</div>
    </div>
    <div class="meta-item">
      <div class="value">${questions.length}</div>
      <div class="label">Questions</div>
    </div>
    <div class="meta-item">
      <div class="value">${stats.completionRate}%</div>
      <div class="label">Complétion</div>
    </div>
    <div class="meta-item">
      <div class="value">${stats.avgRating || 'N/A'}</div>
      <div class="label">Note moyenne</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Résultats détaillés par question</h2>
    ${questions.map((q, idx) => generateQuestionHTML(q, idx, stats)).join('')}
  </div>

  <div class="footer">
    <p>Ce rapport a été généré automatiquement à partir des données collectées.</p>
  </div>
</body>
</html>`;

    return htmlContent;
  };

  const calculateStatistics = () => {
    const stats: any = {
      completionRate: 0,
      avgRating: null,
      questionStats: {},
    };

    if (responses.length === 0) return stats;

    // Completion rate
    const totalPossible = responses.length * questions.length;
    const totalAnswered = responses.reduce((acc, r) => {
      return acc + Object.keys(r.answers).filter(k => r.answers[k] !== undefined && r.answers[k] !== "").length;
    }, 0);
    stats.completionRate = totalPossible > 0 ? Math.round((totalAnswered / totalPossible) * 100) : 0;

    // Per-question stats
    questions.forEach(q => {
      const questionResponses = responses.map(r => r.answers[q.id]).filter(a => a !== undefined && a !== null && a !== "");
      
      if (q.question_type === "rating") {
        const ratings = questionResponses.map(Number).filter(n => !isNaN(n));
        if (ratings.length > 0) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          stats.questionStats[q.id] = {
            type: "rating",
            average: avg.toFixed(1),
            distribution: [1, 2, 3, 4, 5].map(r => ({
              value: r,
              count: ratings.filter(rating => rating === r).length,
              percentage: Math.round((ratings.filter(rating => rating === r).length / ratings.length) * 100)
            }))
          };
          if (!stats.avgRating) {
            stats.avgRating = avg.toFixed(1);
          }
        }
      } else if (q.question_type === "radio" || q.question_type === "checkbox") {
        const counts: Record<string, number> = {};
        questionResponses.forEach(r => {
          if (Array.isArray(r)) {
            r.forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
          } else {
            counts[r] = (counts[r] || 0) + 1;
          }
        });
        const total = q.question_type === "checkbox" 
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : questionResponses.length;
        
        stats.questionStats[q.id] = {
          type: q.question_type,
          options: (q.options || []).map(opt => ({
            label: opt,
            count: counts[opt] || 0,
            percentage: total > 0 ? Math.round(((counts[opt] || 0) / (q.question_type === "checkbox" ? responses.length : total)) * 100) : 0
          }))
        };
      } else if (q.question_type === "number") {
        const nums = questionResponses.map(Number).filter(n => !isNaN(n));
        stats.questionStats[q.id] = {
          type: "number",
          average: nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0,
          min: nums.length > 0 ? Math.min(...nums) : 0,
          max: nums.length > 0 ? Math.max(...nums) : 0,
          count: nums.length
        };
      } else {
        stats.questionStats[q.id] = {
          type: "text",
          responses: questionResponses.slice(0, 5),
          totalCount: questionResponses.length
        };
      }
    });

    return stats;
  };

  const generateQuestionHTML = (question: SurveyQuestion, index: number, stats: any) => {
    const qStats = stats.questionStats[question.id];
    if (!qStats) {
      return `
        <div class="question-card">
          <div class="question-text">${index + 1}. ${question.question_text}</div>
          <p style="color: #9ca3af;">Aucune réponse</p>
        </div>
      `;
    }

    let contentHTML = '';

    if (qStats.type === "rating") {
      contentHTML = `
        <div style="margin-bottom: 15px;">
          <strong style="color: #6366f1; font-size: 20px;">⭐ ${qStats.average}/5</strong>
          <span style="color: #6b7280; margin-left: 10px;">moyenne</span>
        </div>
        ${qStats.distribution.map((d: any) => `
          <div class="stat-row">
            <span class="stat-label">${d.value} étoile${d.value > 1 ? 's' : ''}</span>
            <div class="stat-bar">
              <div class="stat-bar-fill" style="width: ${d.percentage}%"></div>
            </div>
            <span class="stat-value">${d.percentage}%</span>
          </div>
        `).join('')}
      `;
    } else if (qStats.type === "radio" || qStats.type === "checkbox") {
      contentHTML = qStats.options.map((opt: any) => `
        <div class="stat-row">
          <span class="stat-label">${opt.label}</span>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width: ${opt.percentage}%"></div>
          </div>
          <span class="stat-value">${opt.percentage}%</span>
        </div>
      `).join('');
    } else if (qStats.type === "number") {
      contentHTML = `
        <div style="display: flex; gap: 20px;">
          <div><strong>Moyenne:</strong> ${qStats.average}</div>
          <div><strong>Min:</strong> ${qStats.min}</div>
          <div><strong>Max:</strong> ${qStats.max}</div>
          <div><strong>Réponses:</strong> ${qStats.count}</div>
        </div>
      `;
    } else {
      contentHTML = `
        <p style="color: #6b7280; margin-bottom: 10px;">${qStats.totalCount} réponse(s)</p>
        ${qStats.responses.map((r: string) => `
          <div class="text-responses">"${r}"</div>
        `).join('')}
        ${qStats.totalCount > 5 ? `<p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">... et ${qStats.totalCount - 5} autres réponses</p>` : ''}
      `;
    }

    return `
      <div class="question-card">
        <div class="question-text">${index + 1}. ${question.question_text}</div>
        ${contentHTML}
      </div>
    `;
  };

  const handleExport = async () => {
    if (responses.length === 0) {
      toast.error("Aucune réponse à exporter");
      return;
    }

    setExporting(true);
    
    try {
      const htmlContent = generatePDFContent();
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Veuillez autoriser les popups pour exporter");
        return;
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
      toast.success("PDF prêt à l'impression");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={exporting || responses.length === 0}
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Export...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
}
