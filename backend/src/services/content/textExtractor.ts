import pdfParse from 'pdf-parse';
import EPub from 'epub';
import { promises as fs } from 'fs';
import logger from '../../shared/utils/logger';

export interface ExtractedText {
  text: string;
  title?: string;
  author?: string;
  wordCount: number;
}

export async function extractTextFromPdf(filePath: string): Promise<ExtractedText> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    const text = data.text.trim();
    const wordCount = text.split(/\s+/).length;

    return {
      text,
      title: data.info?.Title,
      author: data.info?.Author,
      wordCount
    };
  } catch (error) {
    logger.error('PDF extraction error', { error, filePath });
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromEpub(filePath: string): Promise<ExtractedText> {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on('error', (error) => {
      logger.error('EPUB parsing error', { error, filePath });
      reject(new Error('Failed to parse EPUB file'));
    });

    epub.on('end', () => {
      const chapters: string[] = [];
      const flow = epub.flow;

      let completed = 0;
      const total = flow.length;

      if (total === 0) {
        resolve({
          text: '',
          title: epub.metadata.title,
          author: epub.metadata.creator,
          wordCount: 0
        });
        return;
      }

      flow.forEach((chapter) => {
        epub.getChapter(chapter.id, (error, text) => {
          if (error) {
            logger.warn('Chapter extraction error', { error, chapterId: chapter.id });
          } else {
            // Remove HTML tags
            const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            chapters.push(cleanText);
          }

          completed++;

          if (completed === total) {
            const fullText = chapters.join('\n\n');
            const wordCount = fullText.split(/\s+/).length;

            resolve({
              text: fullText,
              title: epub.metadata.title,
              author: epub.metadata.creator,
              wordCount
            });
          }
        });
      });
    });

    epub.parse();
  });
}

export async function extractTextFromTxt(filePath: string): Promise<ExtractedText> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    const wordCount = text.trim().split(/\s+/).length;

    return {
      text: text.trim(),
      wordCount
    };
  } catch (error) {
    logger.error('TXT extraction error', { error, filePath });
    throw new Error('Failed to read text file');
  }
}

export async function extractText(
  filePath: string,
  fileType: string
): Promise<ExtractedText> {
  const extension = fileType.toLowerCase();

  switch (extension) {
    case 'pdf':
      return extractTextFromPdf(filePath);
    case 'epub':
      return extractTextFromEpub(filePath);
    case 'txt':
      return extractTextFromTxt(filePath);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
