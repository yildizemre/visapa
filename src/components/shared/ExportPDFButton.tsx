import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ExportPDFButtonProps {
  elementId: string;
  filename: string;
  className?: string;
}

const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({ elementId, filename, className = '' }) => {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id ${elementId} not found.`);
      return;
    }

    setIsExporting(true);
    try {
      // Elementi geçici olarak tam görünür hale getir
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';

      // Canvas oluşturma
      // Tüm içerik görünür olsun (scroll ile gizlenen elemanlar)
      element.style.height = 'auto';
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#0c1222',
        logging: false,
        windowWidth: 1200,
        windowHeight: element.scrollHeight || window.innerHeight,
        width: 1200,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) => {
          return (
            el.tagName === 'BUTTON' ||
            el.tagName === 'SELECT' ||
            el.classList.contains('no-pdf') ||
            el.getAttribute('data-html2canvas-ignore') === 'true'
          );
        },
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById(elementId);
          if (clonedEl) {
            // PDF için genişlik, dolgu ve hizalama ayarlarını SADECE klonlanmış dökümanda yapıyoruz.
            // Böylece kullanıcının ekranı hiç değişmiyor, ancak PDF kusursuz bir masaüstü genişliğinde (1200px) çıkıyor.
            clonedEl.style.width = '1200px';
            clonedEl.style.maxWidth = '1200px';
            clonedEl.style.padding = '32px';
            clonedEl.style.backgroundColor = '#0c1222';
            
            // Sabit yüzen elemanları (örn. chatbot, süzülen bildirimler) gizle
            clonedEl.querySelectorAll('.fixed, [id*="chatbot"], .z-50').forEach((el) => {
              (el as HTMLElement).style.setProperty('display', 'none', 'important');
            });
            
            // Recharts grafiklerinin klon içinde düzgün sığmasını sağla
            clonedEl.querySelectorAll('.recharts-responsive-container').forEach((el) => {
              (el as HTMLElement).style.setProperty('width', '100%', 'important');
              (el as HTMLElement).style.setProperty('height', '300px', 'important');
            });

            // Grid ve Flex sığma kaymalarını düzelt
            clonedEl.querySelectorAll('.grid').forEach((el) => {
              (el as HTMLElement).style.setProperty('gap', '20px', 'important');
            });

            // Input alanlarını düz metne (span) dönüştür ki kayma ve kenarlık bozulması olmasın
            clonedEl.querySelectorAll('input[type="text"], input[type="number"]').forEach((inputNode) => {
              const input = inputNode as HTMLInputElement;
              const textSpan = clonedDoc.createElement('span');
              textSpan.textContent = input.value;
              textSpan.className = input.className;
              // Inputun stilini koru ama arkaplan/kenarlığı temizle veya sadeleştir
              textSpan.style.border = 'none';
              textSpan.style.background = 'transparent';
              textSpan.style.padding = '0';
              textSpan.style.display = 'inline-block';
              textSpan.style.textAlign = 'center';
              textSpan.style.width = '100%';
              textSpan.style.color = '#ffffff';
              textSpan.style.fontWeight = 'bold';
              
              if (input.parentNode) {
                input.parentNode.replaceChild(textSpan, input);
              }
            });

            // Yazı kaymalarını önlemek için dökümandaki tüm metin elemanlarına standart yazı tipi ve harf aralığı sıfırlaması uyguluyoruz.
            // Bu sayede html2canvas'in farklı tarayıcılarda yazı genişliğini yanlış ölçüp kelimeleri kaydırması kesin olarak engellenir.
            clonedEl.querySelectorAll('p, span, h1, h2, h3, td, th, div, label, a').forEach((node) => {
              const htmlNode = node as HTMLElement;
              htmlNode.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
              htmlNode.style.letterSpacing = '0px';
              htmlNode.style.wordSpacing = '0px';
              htmlNode.style.textShadow = 'none';
              htmlNode.style.setProperty('-webkit-font-smoothing', 'antialiased');
              htmlNode.style.transform = 'none';
              htmlNode.style.whiteSpace = 'normal';
              htmlNode.style.wordBreak = 'break-word';
              htmlNode.style.overflow = 'visible';
            });

            // Truncate (text-ellipsis) olan elemanları da düzelt
            clonedEl.querySelectorAll('[class*="truncate"], [class*="line-clamp"]').forEach((el) => {
              (el as HTMLElement).style.overflow = 'visible';
              (el as HTMLElement).style.textOverflow = 'clip';
              (el as HTMLElement).style.webkitLineClamp = 'unset';
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Sayfa yönünü belirleme (Genişlik yüksekliğe göre fazlaysa Yatay / Landscape)
      const isLandscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Beyaz boşlukları tamamen engellemek için PDF arkaplanını koyu renge boya (#0c1222)
      pdf.setFillColor(12, 18, 34);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      const padding = 10; // Kenar payı (mm)
      const targetWidth = pdfWidth - (padding * 2);
      const targetHeight = pdfHeight - (padding * 2);

      const scaleX = targetWidth / canvas.width;
      const scaleY = targetHeight / canvas.height;
      
      // İçerik yüksekliği genişliğin 1.2 katından fazlaysa çok sayfalı PDF kullan
      const isExtremelyLong = canvas.height > canvas.width * 1.2;

      if (!isExtremelyLong) {
        const scale = Math.min(scaleX, scaleY);
        const imgWidth = canvas.width * scale;
        const imgHeight = canvas.height * scale;
        
        const x = padding + (targetWidth - imgWidth) / 2;
        const y = padding + (targetHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        // Çok uzun listeler için (Örn: Tablolar) - Koyu tema korumalı çoklu sayfa akışı
        const imgWidth = targetWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = pdfHeight - (padding * 2);
        
        let heightLeft = imgHeight;
        let position = padding;
        let pageNum = 0;

        while (heightLeft > 0) {
          if (pageNum > 0) {
            pdf.addPage();
            // Yeni sayfanın da arka planını koyu renge boya
            pdf.setFillColor(12, 18, 34);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
          }

          position = padding - (pageNum * pageHeight);
          pdf.addImage(imgData, 'PNG', padding, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
          pageNum++;
        }
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(t('common.error') || 'PDF dışa aktarılırken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/5 disabled:opacity-50 ${className}`}
    >
      <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'İndiriliyor...' : 'PDF Raporu İndir'}
    </button>
  );
};

export default ExportPDFButton;
