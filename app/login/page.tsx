'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn, signInWithGoogle } from '@/lib/auth/client'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { user, error: authError } = await signIn(email, password)

            if (authError) {
                setError(authError)
                setIsLoading(false)
                return
            }

            if (user) {
                router.push('/app')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError('')
        setIsGoogleLoading(true)

        try {
            const { error: authError } = await signInWithGoogle()

            if (authError) {
                setError(authError)
                setIsGoogleLoading(false)
            }
            // If successful, user will be redirected to Google
        } catch (err) {
            setError('Failed to connect to Google')
            setIsGoogleLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-zinc-900 mb-2 text-center">
                        Welcome Back
                    </h1>
                    <p className="text-zinc-500 text-center mb-8">
                        Sign in to Bias Buster
                    </p>

                    {/* Google Sign In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading || isLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 mb-6 text-base font-bold text-zinc-700 bg-white border-2 border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isGoogleLoading ? (
                            <svg className="w-5 h-5 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                    </button>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-zinc-500 font-medium">or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-bold text-zinc-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-bold text-zinc-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 rounded-xl border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            className="w-full px-4 py-4 text-base font-bold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In with Email'}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <p className="mt-8 text-center text-base text-zinc-600">
                        Dont have an account?{' '}
                        <Link href="/signup" className="text-blue-600 hover:underline font-bold">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
