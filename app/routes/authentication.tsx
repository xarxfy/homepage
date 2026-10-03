import { Copy, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Toaster } from "~/components/ui/sonner"

export default function Authentication() {

    const [users, setUsers] = useState<any[]>([])
    const [apiTokens, setApiTokens] = useState<any[]>([])

    // Formular "Create API Token"
    const [dialogOpen, setDialogOpen] = useState(false)
    const [userId, setUserId] = useState("root@pam")
    const [tokenName, setTokenName] = useState("")
    const [comment, setComment] = useState("")
    const [privsep, setPrivsep] = useState<boolean>(true)
    const [creating, setCreating] = useState(false)

    // Ergebnis nach dem Anlegen (Secret wird nur einmal angezeigt)
    const [newToken, setNewToken] = useState<{ id: string; secret: string } | null>(null)

    async function getUsers() {
        try {
            const res = await fetch("/api/v1/proxmox/access/users")
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            setUsers(data)
        } catch (err) {
            console.error(err)
        }
    }

    async function getApiTokens() {
        try {
            const res = await fetch("/api/v1/proxmox/access/api-tokens")
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            setApiTokens(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function deleteApiKey(userid: string, tokenid: string) {
        if (!confirm(`API-Token ${userid}!${tokenid} wirklich löschen?`)) {
            return
        }

        try {
            const params = new URLSearchParams({ userid, tokenid })
            const res = await fetch(`/api/v1/proxmox/access/api-token/delete?${params}`, {
                method: "POST",
            })
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail ?? `HTTP ${res.status}`)
            }
            toast(`Token ${userid}!${tokenid} gelöscht`)
            getApiTokens()
        } catch (error) {
            toast(`Fehler beim Löschen: ${(error as Error).message}`)
        }
    }

    async function createApiKey(userid: string, tokenid: string, privsep: boolean, comment: string) {
        const params = new URLSearchParams({
            userid,
            tokenid,
            comment,
            privsep: privsep ? "1" : "0",
        })
        const res = await fetch(`/api/v1/proxmox/access/api-token/create?${params}`, {
            method: "POST",
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
            throw new Error(typeof data?.detail === "string" ? data.detail : `HTTP ${res.status}`)
        }
        // Proxmox liefert: { "full-tokenid": "root@pam!xboard", "value": "<secret>", "info": {...} }
        return data
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!tokenName.trim()) return

        setCreating(true)
        try {
            const data = await createApiKey(userId, tokenName.trim(), privsep, comment.trim())
            setNewToken({ id: data["full-tokenid"], secret: data.value })
            setTokenName("")
            setComment("")
            setPrivsep(true)
            getApiTokens()
        } catch (error) {
            toast(`Fehler beim Erstellen: ${(error as Error).message}`)
        } finally {
            setCreating(false)
        }
    }

    async function copySecret() {
        if (!newToken) return
        try {
            await navigator.clipboard.writeText(newToken.secret)
            toast("Secret kopiert")
        } catch {
            // Clipboard-API geht nur über HTTPS oder localhost
            toast("Kopieren nicht möglich, bitte manuell markieren")
        }
    }

    function handleDialogChange(open: boolean) {
        setDialogOpen(open)
        if (!open) {
            // Beim Schließen Secret vergessen, damit es beim nächsten Öffnen nicht mehr da ist
            setNewToken(null)
        }
    }

    useEffect(() => {
        getUsers()
        getApiTokens()
    }, [])

    return (
        <div className="flex flex-col gap-5">

            <Card>
                <CardHeader>
                    <h2 className="text-lg">Users</h2>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-8 font-normal">User</th>
                                <th className="py-2 pr-8 font-normal">Realm</th>
                                <th className="py-2 pr-8 font-normal">Comment</th>
                                <th className="py-2 pr-8 font-normal">2FA</th>
                                <th className="py-2 pr-8 font-normal">Expires</th>
                                <th className="py-2 text-right font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...users]
                                .sort((a, b) => a.userid.localeCompare(b.userid))
                                .map((user) => (
                                    <tr key={user.userid} className="border-b last:border-0">
                                        <td className="py-3 pr-8">{user.userid.split("@")[0]}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{user["realm-type"]}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{user.comment || "–"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{user.keys ? "Ja" : "Nein"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">
                                            {user.expire
                                                ? new Date(user.expire * 1000).toLocaleDateString("de-DE")
                                                : "Nie"}
                                        </td>
                                        <td className="py-3 text-right">
                                            {user.enable
                                                ? <Badge className="bg-green-400 text-black p-1">Aktiv</Badge>
                                                : <Badge className="bg-red-400 text-black p-1">Deaktiviert</Badge>}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg">API Tokens</h2>

                    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                        <DialogTrigger render={<Button variant="outline" title="Neuer Token"><Plus /></Button>} />
                        <DialogContent className="sm:max-w-sm">
                            {newToken ? (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>Token erstellt</DialogTitle>
                                        <DialogDescription>
                                            Kopier das Secret jetzt. Proxmox zeigt es danach nie wieder an.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="flex flex-col gap-3">
                                        <div>
                                            <p className="mb-1 text-sm text-muted-foreground">Token ID</p>
                                            <code className="block break-all rounded-md bg-muted p-2 text-sm">
                                                {newToken.id}
                                            </code>
                                        </div>
                                        <div>
                                            <p className="mb-1 text-sm text-muted-foreground">Secret</p>
                                            <code className="block break-all rounded-md bg-muted p-2 text-sm select-all">
                                                {newToken.secret}
                                            </code>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={copySecret}>
                                            <Copy className="h-4 w-4" /> Kopieren
                                        </Button>
                                        <DialogClose render={<Button type="button">Fertig</Button>} />
                                    </DialogFooter>
                                </>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    <DialogHeader>
                                        <DialogTitle>Create API Token</DialogTitle>
                                        <DialogDescription>Create a new API Token</DialogDescription>
                                    </DialogHeader>

                                    <FieldGroup>
                                        <Field>
                                            <Label htmlFor="tokenid">Token ID</Label>
                                            <Input
                                                id="tokenid"
                                                value={tokenName}
                                                onChange={(e) => setTokenName(e.target.value)}
                                                placeholder="z.B. dashboard"
                                                required
                                            />
                                        </Field>
                                        <Field>
                                            <Label htmlFor="userid">Username</Label>
                                            <select
                                                id="userid"
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                className="rounded-md border bg-transparent px-3 py-2 text-sm"
                                            >
                                                {[...users]
                                                    .sort((a, b) => a.userid.localeCompare(b.userid))
                                                    .map((user) => (
                                                        <option key={user.userid} value={user.userid} className="bg-background">
                                                            {user.userid}
                                                        </option>
                                                    ))}
                                            </select>
                                        </Field>
                                        <Field>
                                            <Label htmlFor="comment">Comment</Label>
                                            <Input
                                                id="comment"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                            />
                                        </Field>
                                        <Field orientation="horizontal">
                                            <input
                                                type="checkbox"
                                                id="privsep"
                                                checked={privsep}
                                                onChange={(e) => setPrivsep(e.target.checked)}
                                            />
                                            <FieldLabel htmlFor="privsep">Privilege Separation</FieldLabel>
                                        </Field>
                                    </FieldGroup>

                                    <DialogFooter>
                                        <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
                                        <Button type="submit" disabled={creating}>
                                            {creating ? "Erstelle..." : "Create"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>
                </CardHeader>

                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-8 font-normal">User</th>
                                <th className="py-2 pr-8 font-normal">Token ID</th>
                                <th className="py-2 pr-8 font-normal">Comment</th>
                                <th className="py-2 pr-8 font-normal">Privilege separation</th>
                                <th className="py-2 pr-8 font-normal">Expires</th>
                                <th className="py-2 text-right font-normal"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...apiTokens]
                                .sort((a, b) =>
                                    `${a.userid}!${a.tokenid}`.localeCompare(`${b.userid}!${b.tokenid}`)
                                )
                                .map((token) => (
                                    <tr key={`${token.userid}!${token.tokenid}`} className="border-b last:border-0">
                                        <td className="py-3 pr-8">{token.userid}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{token.tokenid}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{token.comment || "–"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{token.privsep ? "Ja" : "Nein"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">
                                            {token.expire
                                                ? new Date(token.expire * 1000).toLocaleDateString("de-DE")
                                                : "Nie"}
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                title="Token löschen"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => deleteApiKey(token.userid, token.tokenid)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Toaster />
        </div>
    )
}