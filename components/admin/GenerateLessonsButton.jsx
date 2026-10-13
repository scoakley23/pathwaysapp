import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function GenerateLessonsButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateLessons = async () => {
    setIsGenerating(true);
    
    try {
      // Fetch all civics questions to understand topics
      const questions = await base44.entities.CivicsQuestion.list('-created_date', 500);
      
      // Define main topics in chronological/logical order that build on each other
      const topics = [
        { 
          name: "Principles of American Democracy",
          lessons: [
            { title: "The Constitution - Supreme Law of the Land", order: 1 },
            { title: "We the People - Self-Government and Democracy", order: 2 },
            { title: "The Bill of Rights - First 10 Amendments", order: 3 },
            { title: "The Rule of Law - Everyone Must Follow the Law", order: 4 }
          ]
        },
        { 
          name: "System of Government",
          lessons: [
            { title: "Three Branches of Government", order: 1 },
            { title: "The Legislative Branch - Congress", order: 2 },
            { title: "The Executive Branch - The President", order: 3 },
            { title: "The Judicial Branch - The Supreme Court", order: 4 },
            { title: "Checks and Balances", order: 5 }
          ]
        },
        { 
          name: "Rights and Responsibilities",
          lessons: [
            { title: "Freedom of Speech and Religion", order: 1 },
            { title: "Rights of All Americans", order: 2 },
            { title: "Voting Rights and Civic Participation", order: 3 },
            { title: "Responsibilities of U.S. Citizens", order: 4 }
          ]
        },
        { 
          name: "U.S. History",
          lessons: [
            { title: "Colonial America and Independence", order: 1 },
            { title: "The Revolutionary War and Founding Fathers", order: 2 },
            { title: "The Civil War and Slavery", order: 3 },
            { title: "Modern American History - 1900s to Today", order: 4 }
          ]
        },
        { 
          name: "Geography and Symbols",
          lessons: [
            { title: "U.S. Geography - States and Borders", order: 1 },
            { title: "U.S. Territories and Capitals", order: 2 },
            { title: "American Symbols - Flag, Anthem, and More", order: 3 },
            { title: "National Holidays and Why We Celebrate", order: 4 }
          ]
        }
      ];

      let lessonCount = 0;
      
      for (const topic of topics) {
        // Get relevant 2025 civics questions for this topic
        const topicQuestions = questions.filter(q => 
          q.version === '2025' &&
          (q.category?.includes(topic.name.split(' ')[0]) || 
           q.question?.toLowerCase().includes(topic.name.toLowerCase().split(' ')[0]))
        );

        // Generate lessons in order
        for (const lessonTemplate of topic.lessons) {
          // Find relevant questions for this specific lesson
          const relevantQuestions = topicQuestions.filter(q => 
            q.question.toLowerCase().includes(lessonTemplate.title.toLowerCase().split(' ')[0]) ||
            q.answer.toLowerCase().includes(lessonTemplate.title.toLowerCase().split(' ')[0])
          ).slice(0, 5);

          // Create question list for the lesson
          const questionText = relevantQuestions.length > 0 
            ? relevantQuestions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')
            : '';
          
          // Generate lesson content with AI
          const lessonPrompt = `Create a clear, chronological civics lesson titled "${lessonTemplate.title}" for U.S. citizenship test preparation.

This is lesson ${lessonTemplate.order} in the ${topic.name} series, so it should build on previous knowledge and prepare students for the next lessons.

REQUIREMENTS:
1. Keep the title: "${lessonTemplate.title}"
2. Write 2-sentence description for ESL learners
3. Main content (500-600 words) using SIMPLE English:
   - Short sentences, basic vocabulary
   - Start with basics, build complexity gradually
   - Include 2 relevant Unsplash image URLs in markdown: ![alt](https://images.unsplash.com/photo-[id]?w=800)
   - Use ## headings to organize sections
   - NO dialogues or conversations
   - Teach the concept step-by-step
4. 5-6 key bullet points

${questionText ? `5. Include these 2025 civics test questions naturally in your content:\n${questionText}\n\nExplain each answer clearly in the lesson.` : ''}

6. Suggest YouTube search term for videos

Format as JSON with: title, description, content (markdown with images), key_points (array of objects with text and optional definition), youtube_search, questions_covered (array of question text)`;

          const lessonData = await base44.integrations.Core.InvokeLLM({
            prompt: lessonPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                key_points: { 
                  type: "array", 
                  items: { 
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      definition: { type: "string" }
                    },
                    required: ["text"]
                  } 
                },
                youtube_search: { type: "string" },
                questions_covered: { type: "array", items: { type: "string" } }
              }
            }
          });

          // Search for relevant YouTube video
          let videoUrl = null;
          try {
            const searchResults = await base44.integrations.Core.InvokeLLM({
              prompt: `Find a YouTube video URL for: "${lessonData.youtube_search}" related to U.S. citizenship education. Return just the full URL.`,
              add_context_from_internet: true
            });
            if (searchResults && searchResults.includes('youtube.com')) {
              videoUrl = searchResults.trim();
            }
          } catch (error) {
            console.log('Could not find video for', lessonData.youtube_search);
          }

          // Create lesson with proper ordering
          const lesson = await base44.entities.Lesson.create({
            topic: topic.name,
            title: lessonData.title,
            description: lessonData.description,
            content: lessonData.content,
            key_points: lessonData.key_points,
            order: lessonTemplate.order,
            video_url: videoUrl
          });

          // Generate flashcards  
          const flashcardsPrompt = `Create 6-8 flashcards for the lesson "${lessonData.title}".
Use simple language suitable for ESL learners.
Each flashcard should have:
- term: A key vocabulary word or concept (2-4 words)
- definition: Clear, simple explanation (1-2 sentences, basic English)
- example: A simple example (optional)

Return as JSON with a flashcards array.`;

          const flashcardsData = await base44.integrations.Core.InvokeLLM({
            prompt: flashcardsPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                flashcards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      term: { type: "string" },
                      definition: { type: "string" },
                      example: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          for (const card of flashcardsData.flashcards) {
            await base44.entities.LessonFlashcard.create({
              lesson_id: lesson.id,
              term: card.term,
              definition: card.definition,
              example: card.example || null
            });
          }

          // Generate quiz questions
          const quizPrompt = `Create 5-6 multiple-choice quiz questions about "${lessonData.title}" for U.S. citizenship test prep.

REQUIREMENTS for each question:
- Use simple, clear language (ESL-friendly)
- Test real understanding, not just memorization
- Include practical application questions
- 4 answer options each
- Clear explanation for why the answer is correct

Return as JSON with a questions array.`;

          const quizData = await base44.integrations.Core.InvokeLLM({
            prompt: quizPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correct_answer: { type: "string" },
                      explanation: { type: "string" }
                    }
                  }
                }
              }
            }
          });

          for (const q of quizData.questions) {
            await base44.entities.LessonQuiz.create({
              lesson_id: lesson.id,
              question: q.question,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation
            });
          }

          lessonCount++;
          toast.success(`Created lesson ${lessonCount}: ${lessonData.title}`);
        }
      }

      toast.success(`Successfully generated ${lessonCount} lessons with quizzes and flashcards!`);
      
      // Reload page to show new lessons
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error) {
      console.error('Failed to generate lessons:', error);
      toast.error('Failed to generate lessons. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generateLessons} 
      disabled={isGenerating}
      className="bg-green-600 hover:bg-green-700"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating Lessons...
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4 mr-2" />
          Generate AI Lessons
        </>
      )}
    </Button>
  );
}