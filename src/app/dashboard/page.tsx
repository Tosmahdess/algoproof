import { redirect } from 'next/navigation'

// Tableau comparatif fusionné dans la Vue d'ensemble
export default function DashboardRedirect() {
  redirect('/overview')
}
