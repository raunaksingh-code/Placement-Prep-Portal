with open('frontend/src/features/home/HomePage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "import { api } from '../../lib/api'",
    "import { useSearchParams } from 'react-router-dom'\nimport { api } from '../../lib/api'"
)

content = content.replace(
    "const [searchQuery, setSearchQuery] = useState('')",
    "const [searchParams] = useSearchParams()\n  const searchQuery = searchParams.get('q') || ''"
)

with open('frontend/src/features/home/HomePage.tsx', 'w') as f:
    f.write(content)
