import ContentContainer from '../_components/content-container'
import { getCurrentUserAbility } from '@/actions/auth'
import { getNotifications } from '@/actions/notification'
import NotificationTable from './_components/notification-table'

export default async function NotificationPage() {
  const userInfo = await getCurrentUserAbility()
  const notifications = await getNotifications(userInfo)

  return (
    <ContentContainer>
      <NotificationTable notifications={notifications} />
    </ContentContainer>
  )
}
