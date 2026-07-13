declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react'

  interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    color?: string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
  }

  const createLucideIcon: (name: string, icon: any) => ComponentType<LucideProps>
  export { createLucideIcon }

  export const Plus: ComponentType<LucideProps>
  export const Download: ComponentType<LucideProps>
  export const Upload: ComponentType<LucideProps>
  export const HelpCircle: ComponentType<LucideProps>
  export const Search: ComponentType<LucideProps>
  export const X: ComponentType<LucideProps>
  export const Moon: ComponentType<LucideProps>
  export const Sun: ComponentType<LucideProps>
  export const GripVertical: ComponentType<LucideProps>
  export const ChevronDown: ComponentType<LucideProps>
  export const ChevronRight: ComponentType<LucideProps>
  export const Pencil: ComponentType<LucideProps>
  export const Check: ComponentType<LucideProps>
  export const Sparkles: ComponentType<LucideProps>
  export const Trash2: ComponentType<LucideProps>
  export const Loader2: ComponentType<LucideProps>
  export const Copy: ComponentType<LucideProps>
  export const RefreshCw: ComponentType<LucideProps>
  export const FileText: ComponentType<LucideProps>
  export const ArrowRight: ComponentType<LucideProps>
  export const Layers: ComponentType<LucideProps>
  export const Lightbulb: ComponentType<LucideProps>
  export const Send: ComponentType<LucideProps>
  export const BookOpen: ComponentType<LucideProps>
  export const Key: ComponentType<LucideProps>
  export const Eye: ComponentType<LucideProps>
  export const EyeOff: ComponentType<LucideProps>
}
