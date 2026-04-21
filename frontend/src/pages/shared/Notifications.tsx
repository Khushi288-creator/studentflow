import React, { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

export type Notification = {
  id: string
  title: string
  description: string
  type: string
  createdAt: string
  readAt?: string
}

type NotificationsResponse = { notifications: Notification[] }

export default function Notifications() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await http.get('/notifications')
      return res.data as NotificationsResponse
    },
  })

  // Mark all read when page opens
  useEffect(() => {
    http.post('/notifications/mark-read').then(() => {
      queryClient.invalidateQueries({ queryKey: ['notif-unread'] })
    })
  }, [queryClient])

  const notifications = data?.notifications ?? []

  return (
    <Page title="Notifications" subtitle="Notices and updates for your learning.">
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? <div className="text-sm text-slate-500">Loading notifications...</div> : null}
        {notifications.map((n) => (
          <Card key={n.id}>
            <CardHeader
              title={n.title}
              subtitle={new Date(n.createdAt).toLocaleString()}
              right={
                <div
                  className={[
                    'rounded-xl px-3 py-1 text-xs font-semibold',
                    n.type === 'assignment'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                      : n.type === 'attendance'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        : n.type === 'result'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
                  ].join(' ')}
                >
                  {n.type}
                </div>
              }
            />
            <CardBody>
              <div className="text-sm text-slate-600 dark:text-slate-300">{n.description}</div>
            </CardBody>
          </Card>
        ))}

        {!isLoading && notifications.length === 0 ? (
          <Card className="border-dashed bg-white/40 p-8 text-center text-sm text-slate-500 dark:bg-slate-950/20 lg:col-span-2">
            No notifications yet.
          </Card>
        ) : null}
      </div>
    </Page>
  )
}

