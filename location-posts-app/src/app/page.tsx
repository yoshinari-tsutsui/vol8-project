"use client"
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect } from "react"

export default function Home() {
  const { data: session, status } = useSession()

  const handleSignIn = async () => {
    await signIn("google", { 
      callbackUrl: "/map",
      scope: "openid email profile"
    })
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Welcome, {session.user?.name}!</h1>
        <button 
          onClick={() => signOut()}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Sign Out
        </button>
        <a 
          href="/map" 
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        >
          Go to Map
        </a>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-center mb-8">
        Location Posts App
      </h1>
      <p className="text-xl text-gray-600 text-center max-w-2xl mb-8">
        写真と音楽を投稿して地図上で共有するアプリ
      </p>
      <button 
        onClick={handleSignIn}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg"
      >
        Sign in with Google
      </button>
    </main>
  )
}