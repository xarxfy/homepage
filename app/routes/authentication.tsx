import { Delete, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
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
import { Field, FieldGroup } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

export default function Authentication() {

    const [users, setUsers] = useState<any[]>([])
    const [apiTokens, setApiTokens] = useState<any[]>([])

    async function getUsers() {
        const res = await fetch("/api/v1/proxmox/access/users")
        try {
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
        const res = await fetch("/api/v1/proxmox/access/api-tokens")
        try {
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
        try {
            if (confirm(`Delete API-Token ${tokenid}!${userid}`)) {
                const res = await fetch(`/api/v1/proxmox/access/api-token/delete?userid=${userid}&tokenid=${tokenid}`, {
                    method: "POST",
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => null)
                    throw new Error(err?.detail ?? `HTTP ${res.status}`)
                }
                getApiTokens()
            }
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        getUsers(),
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
                <CardHeader className="flex justify-between">
                    <h2 className="text-lg">API Tokens</h2>
                    <Dialog>
                        <form>
                            <DialogTrigger render={<Button variant="outline"><Plus /></Button>} />
                            <DialogContent className="sm:max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Create API Token</DialogTitle>
                                    <DialogDescription>
                                        Create a new API Token
                                    </DialogDescription>
                                </DialogHeader>
                                <FieldGroup>
                                    <Field>
                                        <Label htmlFor="name-1">Name</Label>
                                        <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
                                    </Field>
                                    <Field>
                                        <Label htmlFor="username-1">Username</Label>
                                        <Input id="username-1" name="username" defaultValue="@peduarte" />
                                    </Field>
                                </FieldGroup>
                                <DialogFooter>
                                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                                    <Button type="submit">Save changes</Button>
                                </DialogFooter>
                            </DialogContent>
                        </form>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-8 font-normal">User</th>
                                <th className="py-2 pr-8 font-normal">Token ID</th>
                                <th className="py-2 pr-8 font-normal">Privilege separation</th>
                                <th className="py-2 pr-8 font-normal">Expires</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...apiTokens]
                                .sort((a, b) => a.tokenid.localeCompare(b.tokenid))
                                .map((token) => (
                                    <tr key={token.tokenid} className="border-b last:border-0">
                                        <td className="py-3 pr-8">{token.userid.split("@")[0]}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{token.tokenid}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">{token.privsep ? "Ja" : "Nein"}</td>
                                        <td className="py-3 pr-8 text-muted-foreground">
                                            {token.expire
                                                ? new Date(token.expire * 1000).toLocaleDateString("de-DE")
                                                : "Nie"}
                                        </td>
                                        <td>
                                            <Button size="icon" variant="outline" title="Shutdown"
                                                onClick={() => deleteApiKey(token.userid, token.tokenid)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div >
    )
}