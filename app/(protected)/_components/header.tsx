import { Button } from 'devextreme-react/button'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { Template } from 'devextreme-react/core/template'
import { ExtendedUser } from '@/auth'
import UserNav from './user-nav'
import NotificationMenu from './notification-menu'

type HeaderProps = { user: ExtendedUser; setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }

export default function Header({ user, setIsOpen }: HeaderProps) {
  return (
    <header id='app-header' className='bg-primary-black flex h-[52px] items-center px-4 shadow-md'>
      <Toolbar className='toolbar-header'>
        <Item visible location='before' widget='dxButton'>
          <Button icon='menu' stylingMode='text' onClick={() => setIsOpen((prev) => !prev)} />
        </Item>

        <Item visible location='before' render={() => <h1 className='text-2xl font-bold text-primary'>Iris</h1>} />

        {/* <Item visible location='after'>
          <NotificationMenu />
        </Item> */}

        <Item location='after' widget='dxDropDownButton' template='dxDropdownButtonTemplate' />

        <Template name='dxDropdownButtonTemplate'>
          <UserNav user={user} />
        </Template>
      </Toolbar>
    </header>
  )
}
