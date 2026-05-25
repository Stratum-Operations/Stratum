// demo.tsx
import SuggestiveSearch from "@/components/ui/suggestive-search"

export default function DemoOne() {
  return (
    <div className="flex justify-center p-10">
      <SuggestiveSearch
        suggestions={[
          "Search your favourite movie",
          "Search user from connection",
          "Find trending topics",
        ]}
        effect="typewriter"
      />
    </div>
  )
}
