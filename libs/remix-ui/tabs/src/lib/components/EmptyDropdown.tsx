import React from 'react'
import DropdownMenu, { MenuItem } from './DropdownMenu'

interface EmptyDropdownProps {}

const EmptyDropdown: React.FC<EmptyDropdownProps> = () => {
  const items: MenuItem[] = []

  return (
    <DropdownMenu
      items={items}
      disabled={true}
      triggerDataId="empty-dropdown-trigger"
      panelDataId="empty-dropdown-panel"
    />
  )
}

export default EmptyDropdown