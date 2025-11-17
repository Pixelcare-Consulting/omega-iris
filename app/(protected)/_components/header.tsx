import { Button } from 'devextreme-react/button'
import Toolbar, { Item } from 'devextreme-react/toolbar'
import { Template } from 'devextreme-react/core/template'
import { ExtendedUser } from '@/auth'
import UserNav from './user-nav'

type HeaderProps = { user: ExtendedUser; setIsOpen: React.Dispatch<React.SetStateAction<boolean>> }

export default function Header({ user, setIsOpen }: HeaderProps) {
  return (
    <header className='flex h-[52px] items-center px-4 shadow-md'>
      <Toolbar>
        <Item visible location='before' widget='dxButton'>
          <Button icon='menu' stylingMode='text' onClick={() => setIsOpen((prev) => !prev)} />
        </Item>

        <Item visible location='before' render={() => <h1 className='text-2xl font-bold text-primary'>Iris</h1>} />

        <Item visible location='after'>
          <div className='relative'>
            <Button icon='belloutline' stylingMode='text' />
            {/* <div className='dx-badge absolute -right-2 -top-1'>4</div> */}
          </div>
        </Item>

        <Item location='after' widget='dxDropDownButton' template='dxDropdownButtonTemplate' />
        <Template name='dxDropdownButtonTemplate'>
          <UserNav user={user} />
        </Template>
      </Toolbar>
    </header>
  )
}
