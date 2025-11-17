import { faker } from '@faker-js/faker'

export const createRandomUser = () => {
  const roleName = faker.helpers.arrayElement(['Admin', 'Customer'])

  return {
    id: faker.string.uuid(),
    code: faker.number.int({ min: 1, max: 100 }),
    username: faker.string.alphanumeric({ length: 8 }),
    fname: faker.person.firstName(),
    lname: faker.person.lastName(),
    email: faker.internet.email(),
    emailVerified: faker.date.recent(),
    roleCode: faker.number.int({ min: 1, max: 2 }),
    role: { id: faker.string.uuid(), code: faker.number.int({ min: 1, max: 2 }), name: roleName },
    isOnline: faker.datatype.boolean(),
    isActive: faker.datatype.boolean(),
    location: faker.location.streetAddress(),
    lastIpAddress: faker.internet.ip(),
    lastSignin: faker.date.recent(),
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    deletedAt: faker.date.recent(),
    createdBy: faker.string.uuid(),
    updatedBy: faker.string.uuid(),
    deletedBy: faker.string.uuid(),
  }
}
