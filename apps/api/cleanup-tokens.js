const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupExpiredTokens() {
  try {
    console.log('Cleaning up expired invalidated tokens...');
    
    const result = await prisma.invalidatedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    console.log(`Deleted ${result.count} expired tokens`);
    
    // 현재 남아있는 토큰들도 확인
    const remaining = await prisma.invalidatedToken.findMany();
    console.log(`Remaining invalidated tokens: ${remaining.length}`);
    
    if (remaining.length > 0) {
      console.log('Remaining tokens:');
      remaining.forEach(token => {
        console.log(`- Token ID: ${token.tokenId}, User ID: ${token.userId}, Reason: ${token.reason}, Expires: ${token.expiresAt}`);
      });
      
      // 만약 모든 토큰을 강제로 삭제하려면 (테스트 환경에서만)
      console.log('\nTo force delete all remaining tokens, run:');
      console.log('await prisma.invalidatedToken.deleteMany({});');
    }
    
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupExpiredTokens();
