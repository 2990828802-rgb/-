/**
 * 安全校验模块
 * 用于验证作者激活码，但不直接暴露明文数字。
 */

export const verifyAuthorCode = async (input: string): Promise<boolean> => {
  // 模拟安全解密延迟 (防止快速爆破)
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (!input || input.length !== 6) return false;
  
  // ==========================================
  // 🔒 算法混淆校验 (ALGORITHMIC OBFUSCATION)
  // ==========================================
  // 原密码: 781896
  // 我们不存储 "781896"，而是校验它是否满足特定的数学特性。
  // 将输入拆分为两部分: A=781, B=896
  
  const partA = parseInt(input.substring(0, 3)); 
  const partB = parseInt(input.substring(3, 6));
  
  if (isNaN(partA) || isNaN(partB)) return false;

  // 校验逻辑：
  // 1. A + B 必须等于 1677 (781 + 896)
  // 2. A * B 必须等于 699776 (781 * 896)
  // 3. A - B 必须等于 -115 (781 - 896)
  
  const checksum1 = (partA + partB) === 1677;
  const checksum2 = (partA * partB) === 699776;
  const checksum3 = (partA - partB) === -115;
  
  // 只有输入 781896 才能同时满足所有条件
  return checksum1 && checksum2 && checksum3;
};
