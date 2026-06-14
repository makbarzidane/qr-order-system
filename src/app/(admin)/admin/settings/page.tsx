import { prisma } from '@/lib/prisma';import { SettingsForm } from './settings-form'
export default async function SettingsPage(){const settings=await prisma.cafeSettings.findUnique({where:{id:'default'}});return <SettingsForm settings={settings??{name:'QR Order Cafe',address:'',whatsapp:'',invoiceNote:'',isOpen:true}}/>}
