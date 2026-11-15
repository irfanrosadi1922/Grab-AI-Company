import type { EmployeeId, Task, WorkState } from '../types'

/** Status karyawan AI dihitung dari tugasnya, bukan angka karangan. */
export function workState(id: EmployeeId, tasks: Task[], enabled: boolean): WorkState {
  if (!enabled) return 'Nonaktif'
  return tasks.some((t) => t.assignee === id && (t.status === 'In Progress' || t.status === 'Assigned')) ? 'Bekerja' : 'Siaga'
}

export function employeeStats(id: EmployeeId, tasks: Task[]) {
  const mine = tasks.filter((t) => t.assignee === id)
  return {
    total: mine.length,
    done: mine.filter((t) => t.status === 'Completed').length,
    active: mine.filter((t) => ['Assigned', 'In Progress', 'Review'].includes(t.status)).length,
    failed: mine.filter((t) => t.status === 'Failed').length,
  }
}
