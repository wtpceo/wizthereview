import { redirect } from "next/navigation"

export default function HomePage() {
  // 로그인 시스템이 구현되면 여기서 인증 체크 후 대시보드로 리다이렉트
  redirect("/dashboard")
}
