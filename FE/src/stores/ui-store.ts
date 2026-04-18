import { create } from 'zustand';

type UiState = {
  activeHouseId: string;
  mobileSidebarOpen: boolean;
  setActiveHouseId: (houseId: string) => void;
  setMobileSidebarOpen: (isOpen: boolean) => void;
  toggleMobileSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeHouseId: 'demo-house',
  mobileSidebarOpen: false,
  setActiveHouseId: (activeHouseId) => set({ activeHouseId }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
}));
