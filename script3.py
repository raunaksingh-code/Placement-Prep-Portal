with open('frontend/src/app/Layout.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { Link, Navigate, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'",
    "import { Link, Navigate, NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'"
)

content = content.replace(
    "const navigate = useNavigate()\n  const location = useLocation()",
    "const navigate = useNavigate()\n  const location = useLocation()\n  const [searchParams, setSearchParams] = useSearchParams()"
)

# Insert handleSearch before handleLogout
idx = content.find('const handleLogout = () => {')
if idx != -1:
    handler = '''
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(val)}`)
    } else {
      if (val) {
        setSearchParams({ q: val })
      } else {
        setSearchParams({})
      }
    }
  }

'''
    content = content[:idx] + handler + content[idx:]

# Update input
old_input = '''<input 
                type="text" 
                placeholder="Search for placements..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />'''

new_input = '''<input 
                type="text" 
                value={searchParams.get('q') || ''}
                onChange={handleSearch}
                placeholder="Search for modules..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />'''

content = content.replace(old_input, new_input)

with open('frontend/src/app/Layout.tsx', 'w') as f:
    f.write(content)
