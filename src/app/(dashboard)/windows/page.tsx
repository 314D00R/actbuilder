'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { DB } from '@/lib/constants'
import { useActStore } from '@/store/useActStore'
import { Plus, Square, Trash2 } from 'lucide-react'

export default function WindowsPage() {
	const { windows, buildings, updateWindow, calculateTotal, volumes } =
		useActStore()

	const getSubtotal = () => {
		let sub = 0
		const keys = ['6', '7', '8', '9', '10', '30']
		keys.forEach(k => {
			if (volumes[k] && DB[k]) sub += volumes[k] * DB[k]
		})
		return sub
	}

	const handleAddWindow = () => {
		useActStore.setState(state => {
			const nextId =
				state.windows.length > 0
					? Math.max(...state.windows.map(w => w.id)) + 1
					: 1
			return {
				windows: [
					...state.windows,
					{
						id: nextId,
						bld: '',
						name: '',
						desc: '',
						qty: 1,
						type: 'frame',
						sType: '10',
						w: 0,
						h: 0,
						d: 0.3,
						res_w: 0,
						res_s: 0
					}
				]
			}
		})
		calculateTotal()
	}

	const handleRemoveWindow = (id: number) => {
		useActStore.setState(state => ({
			windows: state.windows.filter(w => w.id !== id)
		}))
		calculateTotal()
	}

	return (
		<div className='space-y-6 max-w-5xl mx-auto pb-12'>
			{getSubtotal() > 0 && (
				<div className='bg-greenDim border border-green/20 p-4 rounded-xl flex justify-between items-center shadow-sm'>
					<span className='text-sm font-bold text-foreground'>
						Підсумок по розділу:
					</span>
					<span className='text-lg font-black text-green'>
						{getSubtotal().toLocaleString('uk-UA', {
							minimumFractionDigits: 2
						})}{' '}
						грн
					</span>
				</div>
			)}

			<Card className='border-l-4 border-l-primary bg-card/60 backdrop-blur-sm shadow-md'>
				<CardHeader className='pb-4'>
					<CardTitle className='text-sm font-bold flex items-center gap-2'>
						<Square
							size={18}
							className='text-primary'
						/>{' '}
						Вікна та Двері
					</CardTitle>
					<p className='text-xs text-muted-foreground'>
						Додавайте всі вікна і двері. Вписуйте ширину/висоту або відразу
						ПЛОЩУ вручну.
					</p>
				</CardHeader>
				<CardContent className='space-y-6'>
					{windows.map(win => (
						<div
							key={win.id}
							className='p-5 bg-secondary/30 border border-border rounded-xl space-y-5'
						>
							<div className='flex items-center justify-between border-b border-border/60 pb-3'>
								<div className='flex items-center gap-3 w-full max-w-xl'>
									<span className='text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded shrink-0'>
										Блок №{win.id}
									</span>
									<Select
										value={win.bld || ''}
										onValueChange={val => updateWindow(win.id, 'bld', val)}
									>
										<SelectTrigger className='w-[180px] bg-background'>
											<SelectValue placeholder='(Без літери)' />
										</SelectTrigger>
										<SelectContent
											position='popper'
											side='bottom'
										>
											<SelectItem value='no_bld'>
												(Без літери / Квартира)
											</SelectItem>
											{buildings
												.filter(b => b.name)
												.map(b => (
													<SelectItem
														key={b.id}
														value={b.name}
													>
														{b.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<Input
										type='text'
										placeholder='Назва зони (напр. Вікна м/п кімната 1)'
										value={win.name || ''}
										onChange={e => updateWindow(win.id, 'name', e.target.value)}
										className='flex-1 bg-background'
									/>
								</div>
								<Button
									variant='ghost'
									size='sm'
									className='text-destructive hover:bg-destructive/10 h-9 w-9 p-0 shrink-0'
									onClick={() => handleRemoveWindow(win.id)}
								>
									<Trash2 size={18} />
								</Button>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
								<div className='space-y-2'>
									<Label className='text-xs uppercase text-muted-foreground'>
										К-сть
									</Label>
									<Input
										type='number'
										value={win.qty || ''}
										onChange={e =>
											updateWindow(win.id, 'qty', parseFloat(e.target.value))
										}
										className='bg-background'
									/>
								</div>
								<div className='space-y-2 md:col-span-2'>
									<Label className='text-xs uppercase text-muted-foreground'>
										Тип
									</Label>
									<Select
										value={win.type}
										onValueChange={val => updateWindow(win.id, 'type', val)}
									>
										<SelectTrigger className='bg-background'>
											<SelectValue />
										</SelectTrigger>
										<SelectContent
											position='popper'
											side='bottom'
										>
											<SelectItem value='frame'>
												Вікно: Рама+Укоси (п.9,10)
											</SelectItem>
											<SelectItem value='glass'>
												Вікно: Тільки скло (п.8)
											</SelectItem>
											<SelectItem value='door_mp'>
												Двері м/п (п.9 без укосів)
											</SelectItem>
											<SelectItem value='door_in_6'>
												Двері міжкімнатні (п.6)
											</SelectItem>
											<SelectItem value='door_out_7'>
												Двері вхідні метал. (п.7)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{win.type === 'frame' && (
									<div className='space-y-2'>
										<Label className='text-xs uppercase text-muted-foreground'>
											Тип укосів
										</Label>
										<Select
											value={win.sType}
											onValueChange={val => updateWindow(win.id, 'sType', val)}
										>
											<SelectTrigger className='bg-background'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent
												position='popper'
												side='bottom'
											>
												<SelectItem value='10'>Штукатурка</SelectItem>
												<SelectItem value='30'>Гіпсокартон</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</div>

							<div className='flex items-center gap-3 flex-wrap bg-background p-3 rounded-lg border border-border'>
								<div className='flex items-center gap-2'>
									<Label className='text-xs uppercase text-muted-foreground'>
										Ш:
									</Label>
									<Input
										type='number'
										value={win.w || ''}
										onChange={e =>
											updateWindow(win.id, 'w', parseFloat(e.target.value))
										}
										className='w-20 h-8'
									/>
								</div>
								<span className='text-muted-foreground/50'>×</span>
								<div className='flex items-center gap-2'>
									<Label className='text-xs uppercase text-muted-foreground'>
										В:
									</Label>
									<Input
										type='number'
										value={win.h || ''}
										onChange={e =>
											updateWindow(win.id, 'h', parseFloat(e.target.value))
										}
										className='w-20 h-8'
									/>
								</div>
								<span className='text-muted-foreground/50'>=</span>
								<div className='flex items-center gap-2'>
									<Label className='text-xs font-bold uppercase text-primary'>
										Площа:
									</Label>
									<Input
										type='number'
										value={win.res_w || ''}
										onChange={e =>
											updateWindow(win.id, 'res_w', parseFloat(e.target.value))
										}
										className='w-24 h-8 font-bold text-primary border-primary/50 bg-primary/5'
									/>
								</div>

								{win.type === 'frame' && (
									<>
										<div className='w-px h-6 bg-border mx-2 hidden md:block'></div>
										<div className='flex items-center gap-2'>
											<Label className='text-xs uppercase text-muted-foreground'>
												Глиб:
											</Label>
											<Input
												type='number'
												value={win.d || ''}
												onChange={e =>
													updateWindow(win.id, 'd', parseFloat(e.target.value))
												}
												className='w-16 h-8'
											/>
										</div>
										<span className='text-muted-foreground/50'>→</span>
										<div className='flex items-center gap-2'>
											<Label className='text-xs font-bold uppercase text-primary'>
												Укоси:
											</Label>
											<Input
												type='number'
												value={win.res_s || ''}
												onChange={e =>
													updateWindow(
														win.id,
														'res_s',
														parseFloat(e.target.value)
													)
												}
												className='w-24 h-8 font-bold text-primary border-primary/50 bg-primary/5'
											/>
										</div>
									</>
								)}
							</div>

							<Input
								type='text'
								placeholder='Опис пошкодження для Акта...'
								value={win.desc || ''}
								onChange={e => updateWindow(win.id, 'desc', e.target.value)}
								className='w-full bg-background'
							/>
						</div>
					))}

					<Button
						variant='outline'
						className='w-full border-dashed border-2 hover:border-primary hover:text-primary h-12'
						onClick={handleAddWindow}
					>
						<Plus
							size={18}
							className='mr-2'
						/>{' '}
						Додати вікно / двері
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
