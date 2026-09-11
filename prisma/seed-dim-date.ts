import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.ceil((diff / oneDay + start.getDay() + 1) / 7)
}

function getISOWeek(date: Date) {
  const temp = new Date(date.valueOf())
  const dayNum = (date.getDay() + 6) % 7
  temp.setDate(temp.getDate() - dayNum + 3)
  const firstThursday = temp.valueOf()

  temp.setMonth(0, 1)
  if (temp.getDay() !== 4) {
    temp.setMonth(0, 1 + ((4 - temp.getDay() + 7) % 7))
  }

  return 1 + Math.ceil((firstThursday - temp.valueOf()) / 604800000)
}

async function generateDates(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const data = []

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const date = new Date(d)

    const day = date.getDate()
    const dayOfWeek = date.getDay()
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    const quarter = Math.ceil(month / 3)
    const halfYear = month <= 6 ? 1 : 2

    const weekOfYear = getWeekOfYear(date)
    const isoWeek = getISOWeek(date)

    data.push({
      date,

      day,
      dayOfWeek,
      dayName: dayNames[dayOfWeek],

      weekOfYear,
      isoWeek,

      month,
      monthName: monthNames[month - 1],

      quarter,
      halfYear,
      year,

      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isMonthStart: day === 1,
      isMonthEnd: new Date(year, month, 0).getDate() === day,
      isYearStart: month === 1 && day === 1,
      isYearEnd: month === 12 && day === 31,
    })
  }

  console.log(`Generating ${data.length} dates...`)

  await prisma.dimDate.createMany({
    data,
    skipDuplicates: true,
  })

  console.log('DimDate generation complete.')
}

async function main() {
  await generateDates('2020-01-01', '2035-12-31')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
