export default function TailwindIndicatorProvider() {
  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className='font-mono fixed bottom-2 left-1 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 p-3 text-xs text-white'>
      <div id='breakpoint-xs' className='xs:block sm:hidden'>
        xs
      </div>
      <div id='breakpoint-sm' className='hidden sm:block md:hidden lg:hidden xl:hidden 2xl:hidden'>
        sm
      </div>
      <div id='breakpoint-md' className='hidden md:block lg:hidden xl:hidden 2xl:hidden'>
        md
      </div>
      <div id='breakpoint-lg' className='hidden lg:block xl:hidden 2xl:hidden'>
        lg
      </div>
      <div id='breakpoint-xl' className='hidden xl:block 2xl:hidden'>
        xl
      </div>
      <div id='breakpoint-2xl' className='hidden 2xl:block'>
        2xl
      </div>
    </div>
  )
}
