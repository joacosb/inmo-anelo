using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;

const int BoardWidth = 32;
const int BoardHeight = 18;

Console.Title = "Snake";
Console.CursorVisible = false;
Console.Clear();

var game = new SnakeGame(BoardWidth, BoardHeight);
game.Run();

class SnakeGame
{
    private readonly int width;
    private readonly int height;
    private readonly Snake snake;
    private readonly Random random = new();
    private Position food;
    private int score;
    private Direction direction = Direction.Right;
    private Direction pendingDirection = Direction.Right;
    private TimeSpan tickRate = TimeSpan.FromMilliseconds(140);

    public SnakeGame(int width, int height)
    {
        this.width = width;
        this.height = height;
        snake = new Snake(new Position(width / 2, height / 2));
        food = SpawnFood();
    }

    public void Run()
    {
        var nextTick = DateTime.UtcNow;
        DrawFrame();

        while (true)
        {
            ReadInput();

            if (DateTime.UtcNow < nextTick)
            {
                Thread.Sleep(1);
                continue;
            }

            var nextDirection = pendingDirection;
            var nextHead = GetNextPosition(snake.Head, nextDirection);
            var willGrow = nextHead.Equals(food);

            var hitsWall = IsWallCollision(nextHead);
            var hitsSelf = snake.Contains(nextHead) && !(snake.Tail.Equals(nextHead) && !willGrow);

            if (hitsWall || hitsSelf)
            {
                break;
            }

            snake.Move(nextHead, willGrow);
            direction = nextDirection;

            if (willGrow)
            {
                score += 10;
                food = SpawnFood();
                // Increase speed gradually as the snake grows.
                var faster = Math.Max(60, tickRate.TotalMilliseconds - 5);
                tickRate = TimeSpan.FromMilliseconds(faster);
            }

            DrawFrame();
            nextTick = DateTime.UtcNow + tickRate;
        }

        ShowGameOver();
    }

    private void ReadInput()
    {
        while (Console.KeyAvailable)
        {
            var key = Console.ReadKey(true).Key;
            var requested = key switch
            {
                ConsoleKey.UpArrow => Direction.Up,
                ConsoleKey.DownArrow => Direction.Down,
                ConsoleKey.LeftArrow => Direction.Left,
                ConsoleKey.RightArrow => Direction.Right,
                _ => pendingDirection
            };

            if (!IsOpposite(direction, requested) && requested != pendingDirection)
            {
                pendingDirection = requested;
            }
        }
    }

    private bool IsWallCollision(in Position pos) =>
        pos.X < 0 || pos.X >= width || pos.Y < 0 || pos.Y >= height;

    private Position SpawnFood()
    {
        Position candidate;
        do
        {
            candidate = new Position(random.Next(width), random.Next(height));
        } while (snake.Contains(candidate));
        return candidate;
    }

    private static bool IsOpposite(Direction a, Direction b) =>
        (a == Direction.Up && b == Direction.Down) ||
        (a == Direction.Down && b == Direction.Up) ||
        (a == Direction.Left && b == Direction.Right) ||
        (a == Direction.Right && b == Direction.Left);

    private static Position GetNextPosition(Position head, Direction direction) => direction switch
    {
        Direction.Up => head with { Y = head.Y - 1 },
        Direction.Down => head with { Y = head.Y + 1 },
        Direction.Left => head with { X = head.X - 1 },
        Direction.Right => head with { X = head.X + 1 },
        _ => head
    };

    private void DrawFrame()
    {
        var builder = new StringBuilder();
        builder.Append('+').Append('-', width).Append('+').AppendLine();
        for (var y = 0; y < height; y++)
        {
            builder.Append('|');
            for (var x = 0; x < width; x++)
            {
                var position = new Position(x, y);
                if (snake.Head.Equals(position))
                {
                    builder.Append('@');
                }
                else if (food.Equals(position))
                {
                    builder.Append('*');
                }
                else if (snake.Contains(position))
                {
                    builder.Append('o');
                }
                else
                {
                    builder.Append(' ');
                }
            }

            builder.Append('|').AppendLine();
        }

        builder.Append('+').Append('-', width).Append('+').AppendLine();
        builder.Append("Puntuacion: ").Append(score).AppendLine();
        builder.Append("Usa las flechas para mover la serpiente.");

        Console.SetCursorPosition(0, 0);
        Console.Write(builder.ToString());
    }

    private void ShowGameOver()
    {
        Console.SetCursorPosition(0, height + 4);
        Console.WriteLine("Juego terminado. Puntuacion: {0}", score);
        Console.WriteLine("Presiona cualquier tecla para salir.");
        Console.CursorVisible = true;
        Console.ReadKey(true);
    }
}

enum Direction
{
    Up,
    Down,
    Left,
    Right
}

readonly record struct Position(int X, int Y);

class Snake
{
    private readonly LinkedList<Position> segments = new();
    private readonly HashSet<Position> occupied = new();

    public Snake(Position start)
    {
        segments.AddFirst(start);
        occupied.Add(start);

        for (var i = 1; i <= 2; i++)
        {
            var segment = start with { X = start.X - i };
            segments.AddLast(segment);
            occupied.Add(segment);
        }
    }

    public Position Head => segments.First!.Value;

    public Position Tail => segments.Last!.Value;

    public bool Contains(Position position) => occupied.Contains(position);

    public void Move(Position nextHead, bool grow)
    {
        segments.AddFirst(nextHead);
        occupied.Add(nextHead);

        if (!grow)
        {
            var tail = segments.Last!.Value;
            segments.RemoveLast();
            occupied.Remove(tail);
        }
    }
}
