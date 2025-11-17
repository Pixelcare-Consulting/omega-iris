import BackButton from './_components/back-button'

export default function Protected404NotFound() {
  return (
    <div className='h-full w-full px-2 py-4'>
      <div className='m-auto flex h-full w-full items-center justify-center rounded-lg p-6'>
        <div className='flex max-w-[480px] flex-col items-center justify-center gap-y-4'>
          <h1 className='w-fit text-7xl font-extrabold text-primary dark:text-slate-200'>404</h1>
          <div className='flex flex-col items-center justify-center gap-y-2'>
            <h2 className='w-fit text-2xl font-semibold'>Page Not Found</h2>
            <p className='text-muted-foreground text-center text-base text-slate-400'>
              Oops!. We couldn’t find the page that <br />
              you’re looking for.
            </p>

            <BackButton className='mt-3' />
          </div>
        </div>
      </div>
    </div>
  )
}
