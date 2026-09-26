import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Separator } from "~/components/ui/separator"

export default function Network() {

    const [netInfo, setNetInfo] = useState<any[]>([])

    const [health, setHealth] = useState<any>()
    const healthToastShown = useRef(false)

    useEffect(() => {
        async function healthCheck() {
            try {
                const res = await fetch("/api/v1/health")

                if (!res.ok) {
                    if (!healthToastShown.current) {
                        toast("API down")
                        healthToastShown.current = true
                    }

                    return false
                }

                const data = await res.json()
                setHealth(data)

                if (data.status === "ok") {
                    // Sobald die API wieder erreichbar ist,
                    // darf beim nächsten Ausfall wieder ein Toast kommen
                    healthToastShown.current = false

                    return true
                }

                return false

            } catch (error) {
                console.error("Health Check Error:", error)

                if (!healthToastShown.current) {
                    toast("API down")
                    healthToastShown.current = true
                }

                return false
            }
        }

        async function getNetInfo() {
            const res = await fetch("/api/v1/proxmox/nodes/pve/network")
            try {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }
                const data = await res.json()
                setNetInfo(data)
            } catch (error) {
                console.error(error)
            }
        }

        async function updateData() {
            const healthy = await healthCheck()

            if (!healthy) {
                return
            }

            await Promise.all([
                getNetInfo()
            ])
        }


        // Sofort prüfen
        updateData()

        // Danach alle 5 Sekunden prüfen
        const interval = setInterval(() => {
            updateData()
        }, 5000)

        return () => {
            clearInterval(interval)
        }

    }, [])

    return (
        <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">IP</th>
                        <th className="px-4 py-3 font-medium">Comment</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {[...netInfo]
                        .sort((a, b) => b.iface.localeCompare(a.iface, undefined, { numeric: true }))
                        .map((nic) => (
                            <tr key={nic.iface} className="transition-colors">
                                <td className="px-4 py-3 font-medium">{nic.iface}</td>
                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                    {nic.cidr ?? "–"}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {nic.comments?.trim() || "–"}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${nic.active
                                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                                            }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${nic.active ? "bg-green-500" : "bg-red-500"
                                                }`}
                                        />
                                        {nic.active ? "up" : "down"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    )
}