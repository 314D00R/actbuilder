import Link from 'next/link'

export default function NotFound() {
	return (
		<div className='flex h-screen flex-col items-center justify-center gap-4'>
			<h1 className='text-5xl font-bold'>404</h1>
			<p className='text-2xl font-semibold'>Page not found</p>
			<Link
				className='underline text-lg font-mono'
				href='/general'
			>
				← Back to general page
			</Link>
		</div>
	)
}
