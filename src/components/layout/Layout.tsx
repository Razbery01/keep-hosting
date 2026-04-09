import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppChatButton from './WhatsAppChatButton'
import { Toaster } from 'sonner'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppChatButton />
      <Toaster position="top-right" richColors />
    </div>
  )
}
