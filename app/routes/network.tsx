import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"

export default function Network() {

    const [netInfo, setNetInfo] = useState<any[]>([])

    const [health, setHealth] = useState<any>()
    const healthToastShown = useRef(false)
    const [dnsInfo, setDnsInfo] = useState<any>({})
    const [lookupName, setLookupName] = useState("")
    const [lookupType, setLookupType] = useState("A")
    const [lookupResult, setLookupResult] = useState<any>(null)
    const [lookupError, setLookupError] = useState<string | null>(null)
    const [lookupLoading, setLookupLoading] = useState(false)

    async function runLookup(e: React.FormEvent) {
        e.preventDefault()
        if (!lookupName.trim()) return

        setLookupLoading(true)
        setLookupError(null)
        setLookupResult(null)

        try {
            const params = new URLSearchParams({ name: lookupName.trim(), type: lookupType })
            if (dnsInfo?.dns1) params.set("server", dnsInfo.dns1)

            const res = await fetch(`/api/v1/tools/network/dns/lookup?${params}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail ?? `HTTP ${res.status}`)
            }
            setLookupResult(data)
        } catch (error) {
            setLookupError((error as Error).message)
        } finally {
            setLookupLoading(false)
        }
    }

    async function getDnsInfo() {
        const res = await fetch("/api/v1/proxmox/nodes/pve/network/dns")
        try {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            setDnsInfo(data)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        getDnsInfo()
    }, [])

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
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <h2 className="text-lg">Network</h2>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-8 font-normal">Name</th>
                                <th className="py-2 pr-8 font-normal">Type</th>
                                <th className="py-2 pr-8 font-normal">IP</th>
                                <th className="py-2 pr-8 font-normal">Port</th>
                                <th className="py-2 pr-8 font-normal">Comment</th>
                                <th className="py-2 text-right font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...netInfo]
                                .sort((a, b) => b.iface.localeCompare(a.iface, undefined, { numeric: true }))
                                .map((nic) => (
                                    <tr key={nic.iface} className="border-b last:border-0">
                                        <td className="py-3 pr-8">{nic.iface}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{nic.type}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{nic.cidr ?? "–"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{nic.bridge_ports || "–"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{nic.comments?.trim() || "–"}</td>
                                        <td className="py-3 text-right">
                                            {nic.active
                                                ? <Badge className="bg-green-400 text-black p-1">Up</Badge>
                                                : <Badge className="bg-red-400 text-black p-1">Down</Badge>}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <h2 className="text-lg">DNS</h2>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <table className="w-full">
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2 pr-8 text-muted-foreground">DNS Server</td>
                                <td className="py-2">{dnsInfo?.dns1 ?? "–"}</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-8 text-muted-foreground">Search Domain</td>
                                <td className="py-2">{dnsInfo?.search ?? "–"}</td>
                            </tr>
                        </tbody>
                    </table>

                    <form onSubmit={runLookup} className="flex gap-2">
                        <Input
                            placeholder="Hostname oder IP, z.B. google.com"
                            value={lookupName}
                            onChange={(e) => setLookupName(e.target.value)}
                        />
                        <select
                            value={lookupType}
                            onChange={(e) => setLookupType(e.target.value)}
                            className="rounded-md border bg-transparent px-3 text-sm"
                        >
                            {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "PTR"].map((t) => (
                                <option key={t} value={t} className="bg-background">{t}</option>
                            ))}
                        </select>
                        <Button type="submit" disabled={lookupLoading}>
                            {lookupLoading ? "Suche..." : "Lookup"}
                        </Button>
                    </form>

                    {lookupError && <p className="text-red-400">{lookupError}</p>}

                    {lookupResult && (
                        <div>
                            <p className="mb-2 text-muted-foreground">
                                {lookupResult.type}-Records für {lookupResult.name} via {lookupResult.server}
                                {lookupResult.ttl != null && ` · TTL ${lookupResult.ttl}s`}
                            </p>
                            {lookupResult.records.length === 0 ? (
                                <p className="text-muted-foreground">Keine Records gefunden</p>
                            ) : (
                                <table className="w-full">
                                    <tbody>
                                        {lookupResult.records.map((r: string) => (
                                            <tr key={r} className="border-b last:border-0">
                                                <td className="py-2 font-mono">{r}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}