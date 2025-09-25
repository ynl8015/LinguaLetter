export async function deleteAccount(password?: string) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('로그인이 필요합니다.');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (response.ok) {
      // 로컬 스토리지 정리
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { success: true, message: data.message };
    } else {
      throw new Error(data.message || '회원 탈퇴 중 오류가 발생했습니다.');
    }
  } catch (error: any) {
    throw new Error(error.message || '회원 탈퇴 중 오류가 발생했습니다.');
  }
}
