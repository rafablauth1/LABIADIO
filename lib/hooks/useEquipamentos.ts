'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface EquipOption {
  id: string
  tag: string
  descricao: string
  status: string
}

export function useEquipamentos() {
  const supabase = createClient()
  const [equip, setEquip] = useState<EquipOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('equipamentos')
      .select('id, tag, descricao, status')
      .order('tag')
      .then(({ data }) => {
        setEquip(data || [])
        setLoading(false)
      })
  }, [])

  return { equip, loading }
}
