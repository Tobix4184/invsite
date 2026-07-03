import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTasksForUser, getTaskStats } from "@/app/actions/tasks"
import { TaskCenter } from "@/components/task-center"
import { BottomNav } from "@/components/bottom-nav"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const session = await getSession()
  if (!session?.user) redirect("/")

  const [tasks, stats] = await Promise.all([getTasksForUser(), getTaskStats()])

  return (
    <div className="min-h-screen pb-24">
      <TaskCenter tasks={tasks} stats={stats} />
      <BottomNav />
    </div>
  )
}
