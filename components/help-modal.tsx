'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function HelpModal() {
  const [open, setOpen] = useState(false)

  const guides = [
    {
      title: '📋 Adding Assignments',
      content:
        'You can add assignments in two ways: 1) Connect your Google Classroom account to automatically sync your assignments, or 2) Manually add tasks using the "Add Task" button. Fill in the title, due date, course name, and optionally set a priority tag (Test Prep, Project, Long-term, Short-term, or Personal).',
    },
    {
      title: '✨ Generating a Schedule',
      content:
        'Click the "Generate Schedule" button on the dashboard. Choose your timeframe (Today, This Week, or This Month), set your study preferences (study hours, break duration, available days), and estimate how long each task will take. The AI will create a personalized schedule optimized for your workflow!',
    },
    {
      title: '🎯 Using Priority Tags',
      content:
        'Tags help prioritize your work. Test Prep is for exams, Project for long projects, Long-term for assignments due soon, Short-term for tasks that\'s coming up, and Personal for other activities. The AI uses these tags to schedule your tasks intelligently.',
    },
    {
      title: '📊 View Your Schedule',
      content:
        'Once generated, your schedule displays with time blocks showing exactly when to work on each task. You can see the full breakdown by day and easily adjust your preferences to regenerate if needed.',
    },
    {
      title: '💾 Saving Progress',
      content:
        'Your assignments and schedules are automatically saved to your account. Whether you generate a schedule or add tasks manually, everything is stored securely so you won\'t lose your progress.',
    },
    {
      title: '🌙 Dark Mode',
      content:
        'Click the moon/sun icon in the top-right to toggle between light and dark mode. Dark mode is perfect for late-night studying and easier on the eyes!',
    },
  ]

  const faqs = [
    {
      question: '❓ How can I generate a schedule?',
      answer:
        'Click the "Generate Schedule" button on your dashboard. Select your preferred timeframe, adjust your study preferences (hours, breaks, available days), estimate task durations, and the AI will create a personalized schedule for you.',
    },
    {
      question: '❓ Can I connect my Google Classroom?',
      answer:
        'Yes! During sign-up or in your dashboard, you can authorize WorkFlow to access your Google Classroom. Your assignments will sync automatically, and you can manually add additional tasks as needed.',
    },
    {
      question: '❓ How long does schedule generation take?',
      answer:
        'Schedule generation typically takes 10-30 seconds depending on the number of assignments. The AI analyzes your tasks, priorities, and preferences to create an optimized study plan.',
    },
    {
      question: '❓ Can I edit my tasks after adding them?',
      answer:
        'Yes! Click on any task card to edit its details. You can update the title, due date, course, priority tag, and estimated duration anytime.',
    },
    {
      question: '❓ What makes the AI schedule smart?',
      answer:
        'Our AI considers task deadlines, priority tags, work-life balance, your study window, preferred session length, and break patterns. It spreads work logically across days to prevent burnout.',
    },
    {
      question: '❓ Is my data private and secure?',
      answer:
        'Absolutely! We only access your Google Classroom if you explicitly authorize it. Your personal study data is encrypted and never shared with third parties.',
    },
    {
      question: '❓ Can I change my study preferences?',
      answer:
        'Yes! Before generating a schedule, you can customize your study window (e.g., 4 PM to 9 PM), session length, break duration, and which days you\'re available to study.',
    },
    {
      question: '❓ What if I don\'t have any assignments?',
      answer:
        'You can still generate a schedule! You can add personal tasks and goals. The AI will help you structure your time for self-study and personal projects.',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 hover:bg-muted"
          title="Help & FAQ"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">📚 Help & Getting Started</DialogTitle>
          <DialogDescription>
            Learn how to use WorkFlow and find answers to common questions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guide">📖 Beginner Guide</TabsTrigger>
            <TabsTrigger value="faq">❓ FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-4 mt-4">
            <div className="space-y-4">
              {guides.map((guide, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <h3 className="font-semibold text-foreground mb-2">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {guide.content}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="space-y-3 mt-4">
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <h4 className="font-semibold text-foreground mb-2">
                    {faq.question}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-sm text-foreground">
            💡 <strong>Tip:</strong> Start by adding your assignments, then generate your first
            schedule to see the magic happen!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
