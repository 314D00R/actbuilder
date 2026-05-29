import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-sans'
})

export const metadata: Metadata = {
	title: 'ActBuilder | єВідновлення',
	description: 'Генератор актів обстеження'
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			lang='uk'
			data-theme='dark'
			className={cn('font-sans', manrope.variable)}
		>
			<body
				className={`${manrope.className} bg-bg text-textMain min-h-screen text-sm custom-scrollbar`}
			>
				<Toaster
					position='top-center'
					theme='dark'
				/>
				{children}
			</body>
		</html>
	)
}
