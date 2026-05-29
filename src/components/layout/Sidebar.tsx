'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { useActStore } from '@/store/useActStore'
import {
	Box,
	Building,
	ClipboardList,
	Database,
	FileOutput,
	Home,
	LogOut,
	Square,
	SquareDashed,
	Table,
	Users,
	Warehouse,
	Zap
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
	{
		group: 'Документ',
		items: [
			{ name: 'Загальні дані', href: '/general', icon: Home },
			{ name: 'Комісія', href: '/static', icon: Users },
			{ name: 'Техпаспорт', href: '/techpass', icon: Building }
		]
	},
	{
		group: 'Пошкодження',
		items: [
			{ name: 'Дах / Перекриття', href: '/roof', icon: Warehouse },
			{ name: 'Вікна / Двері', href: '/windows', icon: Square },
			{ name: 'Стіни / Стеля', href: '/walls', icon: SquareDashed },
			{ name: 'Підлоги', href: '/floors', icon: Box },
			{ name: 'Фасад / Фунд.', href: '/facade', icon: Building },
			{ name: 'Інженерія', href: '/eng', icon: Zap }
		]
	},
	{
		group: 'Підсумок',
		items: [
			{ name: "База об'єктів", href: '/database', icon: Database },
			{ name: 'Зведена таблиця', href: '/volumes', icon: Table },
			{ name: 'Експорт', href: '/export', icon: FileOutput }
		]
	}
]

export default function Sidebar() {
	const pathname = usePathname()
	const { totalSum } = useActStore()

	return (
		<div className='fixed flex flex-col w-64 h-screen bg-card border-r border-border'>
			<div className='p-5 flex items-center gap-3'>
				<div className='bg-primary p-1.5 rounded-md'>
					<ClipboardList
						size={20}
						className='text-primary-foreground'
					/>
				</div>
				<span className='font-bold text-lg tracking-tight'>ActBuilder</span>
			</div>

			<div className='px-4 mb-4'>
				<div className='bg-secondary/50 rounded-xl p-4 border border-border'>
					<p className='text-[10px] uppercase font-bold text-muted-foreground mb-1'>
						Сума за актом
					</p>
					<p className='text-xl font-black text-primary'>
						{totalSum.toLocaleString()}{' '}
						<span className='text-xs font-normal opacity-70'>грн</span>
					</p>
				</div>
			</div>

			<nav className='flex-1 px-4 overflow-y-auto space-y-6 py-4 custom-scrollbar'>
				{menuItems.map(group => (
					<div key={group.group}>
						<h3 className='px-2 mb-2 text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest'>
							{group.group}
						</h3>
						<div className='space-y-1'>
							{group.items.map(item => (
								<Link
									key={item.href}
									href={item.href}
								>
									<span
										className={cn(
											'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
											pathname === item.href
												? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
												: 'text-muted-foreground hover:bg-secondary hover:text-foreground'
										)}
									>
										<item.icon size={18} />
										{item.name}
									</span>
								</Link>
							))}
						</div>
					</div>
				))}
			</nav>

			<div className='p-4 border-t border-border bg-card/80 backdrop-blur-md'>
				<Button
					variant='ghost'
					className='w-full justify-start text-muted-foreground hover:text-destructive'
					onClick={() => authClient.signOut()}
				>
					<LogOut
						size={18}
						className='mr-3'
					/>
					Вийти
				</Button>
			</div>
		</div>
	)
}
