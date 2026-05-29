import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
	return (
		<div className='flex flex-col items-center justify-center h-screen gap-6'>
			<Link href='/login'>
				<Button
					className='text-2xl'
					size='lg'
				>
					login
				</Button>
			</Link>
		</div>
	)
}
