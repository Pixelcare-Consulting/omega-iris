export default function AuthBrandHeader() {
  return (
    <div className='flex items-center justify-center'>
      <img className='mr-2 w-24' src='/omega-logo.png' alt='Omega' />

      <div className='mr-2 h-10 w-0.5 bg-slate-800' />

      <div className='ml-1 flex flex-col justify-center'>
        <h1 className='text-2xl font-bold tracking-tight text-primary'>Iris</h1>
        <p className='-mt-1 text-xs text-slate-500'>Inventory Management System</p>
      </div>
    </div>
  )
}
