import { redirect } from "next/navigation"

export default function HomePage() {
  // 메인 페이지 접속시 로그인 페이지로 리다이렉트
  redirect("/login")
}
