import * as React from "react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import AiAssistat from "@/components/ui/ai-assistat";

export default function DemoOne() {
  return (
    <div className="flex min-h-[200px] w-full items-center justify-center">
      <AnimatedThemeToggler />
    </div>
  );
}

function DemoAiAssistatBasic() {
  return (
    <AiAssistat
      title="Smart AI Assistant"
      description="Interact with an intelligent assistant that understands your queries and provides instant responses."
    />
  );
}

export { DemoAiAssistatBasic }
