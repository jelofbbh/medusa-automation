export function generateRandomEmail(): string {
  return `test_${Date.now()}@yopmail.com`;
}

export const generatePhone = (): string => {
    return `09${Date.now().toString().slice(-8)}`
}